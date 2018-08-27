/**
 * Copyright (C) 2018 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
import * as Class from '@singleware/class';

import { Constructor, ClassDecorator } from './types';
import { Settings } from './settings';

/**
 * Dependency manager class.
 */
@Class.Describe()
export class Manager {
  /**
   * Map of singleton instances.
   */
  @Class.Private()
  private instances: WeakMap<Constructor<any>, Object> = new WeakMap();

  /**
   * Map of dependencies.
   */
  @Class.Private()
  private dependencies: WeakMap<Constructor<any>, Settings> = new WeakMap();

  /**
   * Decorates the specified class to be a dependency class.
   * @param settings Dependency settings.
   * @returns Returns the decorator method.
   */
  @Class.Public()
  public Describe(settings?: Settings): ClassDecorator {
    return <T extends Object>(type: Constructor<T>): void => {
      if (this.dependencies.has(type.prototype)) {
        throw new TypeError(`Dependency type ${type.name} is already described.`);
      }
      this.dependencies.set(type.prototype, settings || {});
    };
  }

  /**
   * Decorates the specified class to be injected by the specified dependencies.
   * @param list List of dependencies.
   * @returns Returns the decorator method.
   */
  @Class.Public()
  public Inject(...list: Constructor<any>[]): ClassDecorator {
    return <T extends Object>(type: Constructor<T>): Constructor<T> => {
      const repository = this.dependencies;
      return new Proxy(type, {
        construct: (type: Constructor<T>, parameters: IArguments, target: any): T => {
          const dependencies = <any>{};
          for (const type of list) {
            const settings = <Settings>repository.get(type.prototype);
            dependencies[settings.name || type.name] = this.resolve(type);
          }
          return Reflect.construct(type, [dependencies, parameters], target);
        }
      });
    };
  }

  /**
   * Resolves the current instance of the specified class type.
   * @param type Class type.
   * @throws Throws a type error when the class type does not exists in the dependencies.
   * @returns Returns the resolved instance.
   */
  @Class.Public()
  public resolve<T extends Object>(type: Constructor<T>): T {
    const settings = <Settings>this.dependencies.get(type.prototype);
    if (!settings) {
      throw new TypeError(`Dependency type ${type ? type.name : void 0} does not exists.`);
    }
    if (settings.singleton) {
      let instance = <T>this.instances.get(type);
      if (!instance) {
        this.instances.set(type, (instance = this.construct(type)));
      }
      return instance;
    }
    return this.construct(type);
  }

  /**
   * Constructs a new instance of the specified class type.
   * @param type Class type.
   * @param parameters Initial parameters.
   * @returns Returns a new instance of the specified class type.
   */
  @Class.Public()
  public construct<T extends Object>(type: Constructor<T>, ...parameters: any[]): T {
    return new type(...parameters);
  }
}
